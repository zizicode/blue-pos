import React, { useMemo, useState } from 'react';
import { Users, Phone, Mail, MapPin, CreditCard, DollarSign } from 'lucide-react';
import { usePOSStore } from '@renderer/store/usePOSStore';
import { useApi } from '@renderer/services/useApi';
import { useAuthStore } from '@renderer/store/auth';
import { useInitializePOSData } from '@renderer/hooks/useInitializePOSData';
import CRUDManager, { CRUDConfig } from '@renderer/components/CRUDManager/CRUDManager';
import { InputConfig } from '@renderer/components/FormsInputs/FormsInputs';
import { formatPrice } from '@renderer/hooks/usePriceInput';
import BottomModal from '@renderer/components/BottomModal/BottomModal';

// ==================== TIPOS ====================
interface Cliente {
  id?: number;
  nombre: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  rfc?: string;
  limite_credito: number;
  saldo_actual?: number;
  tipo: 'general' | 'frecuente' | 'corporativo' | any;
  activo: boolean;
}

// ==================== VALORES INICIALES ====================
const INITIAL_VALUES: Cliente = {
  nombre: '',
  telefono: '',
  email: '',
  direccion: '',
  rfc: '',
  limite_credito: 0,
  tipo: 'frecuente',
  activo: true,
};

// ==================== COMPONENTE ====================
const Clientes: React.FC = () => {
  const { clientes } = usePOSStore();
  const { user } = useAuthStore();
  const { call } = useApi();
  const { loadAllData } = useInitializePOSData();

  // Estados para modales personalizados
  const [modalImportar, setModalImportar] = useState(false);
  const [modalAbonar, setModalAbonar] = useState(false);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null);

  const [montoAbono, setMontoAbono] = useState('');
  const [metodoPago, setMetodoPago] = useState('efectivo');
  const [notaAbono, setNotaAbono] = useState('');
  const [cuentasCliente, setCuentasCliente] = useState<any[]>([]);

  // ==================== HELPERS ====================
  const reloadData = async () => {
    if (user?.usuario.id) {
      await loadAllData(user.usuario.id);
    }
  };

  // ==================== HANDLERS MODALES PERSONALIZADOS ====================
  const handleAbrirModalAbonar = async (rows: Cliente[]) => {
    if (rows.length === 0) return;
    const cliente = rows[0];
    setClienteSeleccionado(cliente);

    try {
      const resp = await call("cuentasPorCobrar", "getAll", { cliente_id: cliente.id });
      if (resp?.success) {
        // Filtrar solo las cuentas pendientes
        const pendientes = resp.data.filter((c: any) => c.estado !== "pagada");
        setCuentasCliente(pendientes);
      }
      setModalAbonar(true);
    } catch (err) {
      console.error("Error al cargar cuentas por cobrar:", err);
      alert("❌ No se pudieron cargar las cuentas por cobrar");
    }
  };


  const handleAbonar = async () => {
    if (!clienteSeleccionado) return;
    const monto = Number(montoAbono);

    if (!monto || monto <= 0) {
      alert('❌ Ingresa un monto válido');
      return;
    }

    if (!metodoPago) {
      alert('❌ Selecciona un método de pago');
      return;
    }

    try {
      // Buscar una cuenta pendiente para aplicar el abono
      const cuentaPendiente = cuentasCliente[0];
      if (!cuentaPendiente) {
        alert("⚠️ Este cliente no tiene cuentas pendientes por cobrar.");
        return;
      }

      const payload = {
        cuenta_id: cuentaPendiente.id,
        monto,
        metodo_pago_id: 1, // si manejas un catálogo, puedes mapearlo según `metodoPago`
        referencia: notaAbono || null,
        usuario_id: user?.usuario.id,
      };

      const result = await call("abonos", "create", payload);

      if (result?.success) {
        alert("✅ Abono registrado exitosamente");
        setMontoAbono('');
        setMetodoPago('efectivo');
        setNotaAbono('');
        setModalAbonar(false);
        await reloadData();
      } else {
        alert("❌ Error al registrar el abono");
      }
    } catch (err) {
      console.error("Error al abonar:", err);
      alert("❌ Error al registrar abono");
    }
  };


  const handleCerrarModalAbonar = () => {
    setModalAbonar(false);
    setClienteSeleccionado(null);
  };

  // ==================== HANDLERS CRUD ====================
  const handleCreate = async (data: Cliente): Promise<boolean> => {
    if (!user?.usuario.id) return false;

    try {
      const payload = {
        nombre: data.nombre,
        telefono: data.telefono || null,
        email: data.email || null,
        direccion: data.direccion || null,
        rfc: data.rfc || null,
        limite_credito: data.limite_credito || 0,
        tipo: data.tipo,
        usuario_id: user.usuario.id,
      };

      const result = await call('clientes', 'create', payload);

      if (result?.success) {
        await reloadData();
        alert('✅ Cliente creado exitosamente');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error al crear cliente:', error);
      alert('❌ Error al crear cliente');
      return false;
    }
  };

  const handleUpdate = async (id: number, data: Cliente): Promise<boolean> => {
    if (!user?.usuario.id) return false;

    try {
      const payload = {
        id,
        nombre: data.nombre,
        telefono: data.telefono || null,
        email: data.email || null,
        direccion: data.direccion || null,
        rfc: data.rfc || null,
        limite_credito: data.limite_credito || 0,
        tipo: data.tipo,
        activo: data.activo,
        usuario_id: user.usuario.id,
      };

      const result = await call('clientes', 'update', payload);

      if (result?.success) {
        await reloadData();
        alert('✅ Cliente actualizado exitosamente');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error al actualizar cliente:', error);
      alert('❌ Error al actualizar cliente');
      return false;
    }
  };

  const handleDelete = async (ids: number[]): Promise<boolean> => {
    if (!user?.usuario.id) return false;

    if (ids.includes(1)) {
      alert('❌ No puedes eliminar el cliente genérico');
      return false;
    }

    try {
      await Promise.all(
        ids.map(id =>
          call('clientes', 'update', {
            id,
            activo: false,
            usuario_id: user.usuario.id
          })
        )
      );

      await reloadData();
      alert(`✅ ${ids.length === 1 ? 'Cliente desactivado' : 'Clientes desactivados'} exitosamente`);
      return true;
    } catch (error) {
      console.error('Error al desactivar clientes:', error);
      alert('❌ Error al desactivar clientes');
      return false;
    }
  };

  // ==================== VALIDACIÓN ====================
  const validate = (data: Cliente): Record<string, string> => {
    const errors: Record<string, string> = {};

    if (!data.nombre.trim()) {
      errors.nombre = 'El nombre es requerido';
    }

    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.email = 'Email inválido';
    }

    if (data.telefono && !/^\d{3}-?\d{3}-?\d{4}$/.test(data.telefono)) {
      errors.telefono = 'Formato: 809-555-1234';
    }

    if (data.limite_credito < 0) {
      errors.limite_credito = 'El límite no puede ser negativo';
    }

    return errors;
  };

  // ==================== CONFIGURACIÓN DE CAMPOS ====================
  const getFormFields = (data: Cliente | null, mode: 'create' | 'edit' | 'view'): InputConfig[] => {
    const isView = mode === 'view';
    const values = data || INITIAL_VALUES;

    return [
      {
        name: 'nombre',
        label: 'Nombre completo',
        type: 'text',
        value: values.nombre,
        placeholder: 'Ej: Juan Pérez',
        required: true,
        disabled: isView,
        icon: <Users />,
        col: 2,
        hint: 'Nombre del cliente o razón social'
      },
      {
        name: 'telefono',
        label: 'Teléfono',
        type: 'text',
        value: values.telefono,
        placeholder: '809-555-1234',
        disabled: isView,
        icon: <Phone />,
        col: 2,
        hint: 'Formato: 809-555-1234'
      },
      {
        name: 'email',
        label: 'Correo electrónico',
        type: 'text',
        value: values.email,
        placeholder: 'cliente@ejemplo.com',
        disabled: isView,
        icon: <Mail />,
        col: 2,
      },
      {
        name: 'rfc',
        label: 'RNC/Cédula',
        type: 'text',
        value: values.rfc,
        placeholder: '000-0000000-0',
        disabled: isView,
        icon: <CreditCard />,
        col: 2,
        hint: 'RNC para empresas o cédula para personas'
      },
      {
        name: 'direccion',
        label: 'Dirección',
        type: 'textarea',
        value: values.direccion,
        placeholder: 'Dirección completa del cliente...',
        disabled: isView,
        icon: <MapPin />,
        col: 4,
        rows: 2,
      },
      {
        name: 'tipo',
        label: 'Tipo de cliente',
        type: 'select',
        value: values.tipo,
        disabled: isView,
        icon: <Users />,
        options: [
          { label: 'General', value: 'general' },
          { label: 'Frecuente', value: 'frecuente' },
          { label: 'Corporativo', value: 'corporativo' },
        ],
        col: 2,
      },
      {
        name: 'limite_credito',
        label: 'Límite de crédito',
        type: 'number',
        value: values.limite_credito,
        placeholder: '0.00',
        disabled: isView,
        icon: <DollarSign />,
        min: 0,
        step: 100,
        col: 2,
        hint: 'Monto máximo de crédito permitido'
      }
    ];
  };

  // ==================== ESTADÍSTICAS ====================
  const stats = useMemo(() => {
    const total = clientes.length;
    const activos = clientes.filter(c => c.activo).length;
    const inactivos = total - activos;
    const conDeuda = clientes.filter(c => Number(c.saldo_actual) > 0).length;
    const totalDeuda = formatPrice(clientes.reduce((sum, c) => sum + (Number(c.saldo_actual) || 0), 0));

    return { total, activos, inactivos, conDeuda, totalDeuda };
  }, [clientes]);

  // ==================== CONFIGURACIÓN DEL CRUD ====================
  const crudConfig: CRUDConfig<Cliente> = useMemo(() => ({
    title: 'Gestión de Clientes',
    subtitle: 'Administra tu cartera de clientes',
    entityName: 'cliente',
    entityNamePlural: 'clientes',

    // 🎯 Botones en el header
    headerButtons: [
      {
        label: 'Importar Excel',
        onClick: () => setModalImportar(true),
        className: 'btn btn-sm btn-primary',
        icon: <Users size={16} />
      }
    ],

    data: clientes,

    cards: [
      {
        title: 'Total de clientes',
        value: stats.total,
        icon: <Users />,
      },
      {
        title: 'Clientes activos',
        value: stats.activos,
        icon: <Users />,
        subValue: `${stats.inactivos} inactivos`
      },
      {
        title: 'Con deuda pendiente',
        value: stats.conDeuda,
        icon: <CreditCard />,
      },
      {
        title: 'Total por cobrar',
        value: `$${stats.totalDeuda}`,
        icon: <DollarSign />,
      },
    ],

    columns: [
      { key: 'id', label: 'ID' },
      { key: 'nombre', label: 'Nombre' },
      {
        key: 'telefono',
        label: 'Teléfono',
        render: (data) => data || '--'
      },
      {
        key: 'email',
        label: 'Email',
        render: (data) => data || '--'
      },
      {
        key: 'tipo',
        label: 'Tipo',
        render: (data) => {
          const tipos: Record<string, { label: string; color: string }> = {
            general: { label: 'General', color: 'secondary' },
            frecuente: { label: 'Frecuente', color: 'primary' },
            corporativo: { label: 'Corporativo', color: 'success' },
          };
          const tipo = tipos[data] || tipos;
          return <span className={`badge badge-${tipo.color} badge-sm`}>{tipo.label}</span>;
        }
      },
      {
        key: 'saldo_actual',
        label: 'Saldo',
        render: (data) => {
          const saldo = Number(data) || 0;
          return (
            <span className={saldo > 0 ? 'text-warning' : 'text-success'}>
              ${formatPrice(saldo)}
            </span>
          );
        }
      },
      {
        key: 'activo',
        label: 'Estado',
        render: (data) => (
          <span className={`badge badge-${data ? 'success' : 'error'} badge-xs`}>
            {data ? 'Activo' : 'Inactivo'}
          </span>
        )
      },
    ],

    formFields: getFormFields,
    initialValues: INITIAL_VALUES,

    onCreate: handleCreate,
    onUpdate: handleUpdate,
    onDelete: handleDelete,
    validate,

    permissions: {
      modulo: 'clientes',
      crear: true,
      editar: true,
      eliminar: true,
      ver: true,
    },

    // 🎯 Acción personalizada: Abonar
    customActions: [
      {
        label: 'Registrar abono',
        onClick: handleAbrirModalAbonar,
        showWhen: 'single',
        variant: 'success',
        icon: <DollarSign size={14} />
      }
    ],

    selectable: true,
    itemsPerPage: 15,
    showCards: true,
    tableIcon: <Users />,
  }), [clientes, stats]);

  // ==================== RENDER ====================
  return (
    <>
      {/* Componente principal */}
      <CRUDManager config={crudConfig} />

      {/* 🎯 Modal personalizado: Importar */}
      <BottomModal
        isOpen={modalImportar}
        onClose={() => setModalImportar(false)}
        actions={
          <>
            <button
              className="btn btn-secondary"
              onClick={() => setModalImportar(false)}
            >
              Cancelar
            </button>
            <button
              className="btn btn-success"
              onClick={() => {
                console.log('Importando...');
                setModalImportar(false);
              }}
            >
              Importar
            </button>
          </>
        }
      >
        <div style={{ padding: '20px' }}>
          <h3 style={{ marginBottom: '20px' }}>📊 Importar Clientes desde Excel</h3>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
              Seleccionar archivo
            </label>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              style={{
                display: 'block',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                width: '100%'
              }}
            />
          </div>

          <div style={{
            padding: '12px',
            background: '#f0f9ff',
            border: '1px solid #bfdbfe',
            borderRadius: '6px',
            fontSize: '14px'
          }}>
            <strong>ℹ️ Formato requerido:</strong>
            <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
              <li>Columna A: Nombre</li>
              <li>Columna B: Teléfono</li>
              <li>Columna C: Email</li>
              <li>Columna D: Límite de crédito</li>
            </ul>
          </div>
        </div>
      </BottomModal>

      {/* 🎯 Modal personalizado: Abonar */}
      <BottomModal
        isOpen={modalAbonar}
        onClose={handleCerrarModalAbonar}
        actions={
          <>
            <button
              className="btn btn-secondary"
              onClick={handleCerrarModalAbonar}
            >
              Cancelar
            </button>
            <button
              className="btn btn-success"
              onClick={handleAbonar}
            >
              Registrar abono
            </button>
          </>
        }
      >
        <div style={{ padding: '20px' }}>
          <h3 style={{ marginBottom: '20px' }}>💰 Registrar Abono</h3>

          {clienteSeleccionado && (
            <>
              <div style={{
                marginBottom: '20px',
                padding: '15px',
                background: '#f9fafb',
                borderRadius: '8px',
                border: '1px solid #e5e7eb'
              }}>
                <div><strong>Cliente:</strong> {clienteSeleccionado.nombre}</div>
                <div><strong>Saldo actual:</strong> <span style={{ color: '#dc2626', fontWeight: 600 }}>${formatPrice(clienteSeleccionado.saldo_actual || 0)}</span></div>
                <div><strong>Límite de crédito:</strong> ${formatPrice(clienteSeleccionado.limite_credito)}</div>
              </div>

              {cuentasCliente.length > 0 ? (
                <div style={{ marginBottom: '15px' }}>
                  <strong>Cuentas pendientes:</strong>
                  <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
                    {cuentasCliente.map(c => (
                      <li key={c.id}>
                        #{c.id} - {c.descripcion || 'Factura'} - Pendiente: ${formatPrice(c.saldo_pendiente)}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p style={{ color: '#666', fontStyle: 'italic' }}>No hay cuentas pendientes.</p>
              )}

              <div style={{ marginBottom: '15px' }}>
                <label>Monto del abono</label>
                <input
                  type="number"
                  value={montoAbono}
                  onChange={e => setMontoAbono(e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '16px'
                  }}
                />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label>Método de pago</label>
                <select
                  value={metodoPago}
                  onChange={e => setMetodoPago(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '16px'
                  }}
                >
                  <option value="efectivo">Efectivo</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="tarjeta">Tarjeta</option>
                </select>
              </div>

              <div>
                <label>Nota (opcional)</label>
                <textarea
                  value={notaAbono}
                  onChange={e => setNotaAbono(e.target.value)}
                  placeholder="Detalles del abono..."
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                />
              </div>
            </>
          )}
        </div>
      </BottomModal>

    </>
  );
};

export default Clientes;