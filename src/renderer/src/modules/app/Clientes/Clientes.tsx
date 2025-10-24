import React, { useMemo } from 'react';
import { Users, Phone, Mail, MapPin, CreditCard, DollarSign } from 'lucide-react';
import { usePOSStore } from '@renderer/store/usePOSStore';
import { useApi } from '@renderer/services/useApi';
import { useAuthStore } from '@renderer/store/auth';
import { useInitializePOSData } from '@renderer/hooks/useInitializePOSData';
import CRUDManager, { CRUDConfig } from '@renderer/components/CRUDManager/CRUDManager';
import { InputConfig } from '@renderer/components/FormsInputs/FormsInputs';

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
  tipo: 'general' | 'frecuente' | 'corporativo';
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

  // ==================== HELPERS ====================
  const reloadData = async () => {
    if (user?.usuario.id) {
      await loadAllData(user.usuario.id);
    }
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

    // No permitir eliminar cliente genérico (id: 1)
    if (ids.includes(1)) {
      alert('❌ No puedes eliminar el cliente genérico');
      return false;
    }

    try {
      // Soft delete: desactivar en lugar de eliminar
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
      },
      {
        name: 'activo',
        label: 'Cliente activo',
        type: 'checkbox',
        value: values.activo,
        disabled: isView || values.id === 1, // No permitir desactivar cliente genérico
        col: 4,
      },
    ];
  };

  // ==================== ESTADÍSTICAS ====================
  const stats = useMemo(() => {
    const total = clientes.length;
    const activos = clientes.filter(c => c.activo).length;
    const inactivos = total - activos;
    const conDeuda = clientes.filter(c => (c.saldo_actual || 0) > 0).length;
    const totalDeuda = clientes.reduce((sum, c) => sum + (c.saldo_actual || 0), 0);

    return { total, activos, inactivos, conDeuda, totalDeuda };
  }, [clientes]);

  // ==================== CONFIGURACIÓN DEL CRUD ====================
  const crudConfig: CRUDConfig<any> = useMemo(() => ({
    // Información básica
    title: 'Gestión de Clientes',
    subtitle: 'Administra tu cartera de clientes',
    entityName: 'cliente',
    entityNamePlural: 'clientes',

    // Datos
    data: clientes,

    // Cards
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

    // Columnas de tabla
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
          const tipo = tipos[data] || tipos.general;
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
              ${saldo}
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

    // Configuración de formulario
    formFields: getFormFields,
    initialValues: INITIAL_VALUES,

    // Handlers CRUD
    onCreate: handleCreate,
    onUpdate: handleUpdate,
    onDelete: handleDelete,

    // Validación
    validate,

    // Permisos
    permissions: {
      modulo: 'clientes',
      crear: true,
      editar: true,
      eliminar: true,
      ver: true,
    },

    // Configuración
    selectable: true,
    itemsPerPage: 15,
    showCards: true,
    tableIcon: <Users />,
  }), [clientes, stats]);

  // ==================== RENDER ====================
  return <CRUDManager config={crudConfig} />;
};

export default Clientes;