import React, { useMemo } from 'react';
import { CreditCard, Building } from 'lucide-react';
import { usePOSStore } from '@renderer/store/usePOSStore';
import { useApi } from '@renderer/services/useApi';
import { useAuthStore } from '@renderer/store/auth';
import { useInitializePOSData } from '@renderer/hooks/useInitializePOSData';
import CRUDManager, { CRUDConfig } from '@renderer/components/CRUDManager/CRUDManager';
import { InputConfig } from '@renderer/components/FormsInputs/FormsInputs';

// ==================== TIPOS ====================
interface Caja {
  id?: number;
  nombre: string;
  almacen_id: number | null;
  activo: boolean;
  almacen_nombre?: string;
}

// ==================== VALORES INICIALES ====================
const INITIAL_VALUES: Caja = {
  nombre: '',
  almacen_id: null,
  activo: true,
};

// ==================== COMPONENTE ====================
const Cajas: React.FC = () => {
  const { cajas, almacenes } = usePOSStore();
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
  const handleCreate = async (data: Caja): Promise<boolean> => {
    if (!user?.usuario.id) return false;

    try {
      const payload = {
        nombre: data.nombre,
        almacen_id: data.almacen_id,
        usuario_id: user.usuario.id,
      };

      const result = await call('cajas', 'create', payload);

      if (result?.success) {
        await reloadData();
        alert('✅ Caja creada exitosamente');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error al crear caja:', error);
      alert('❌ Error al crear caja');
      return false;
    }
  };

  const handleUpdate = async (id: number, data: Caja): Promise<boolean> => {
    if (!user?.usuario.id) return false;

    try {
      const payload = {
        id,
        nombre: data.nombre,
        almacen_id: data.almacen_id,
        activo: data.activo,
        usuario_id: user.usuario.id,
      };

      const result = await call('cajas', 'update', payload);

      if (result?.success) {
        await reloadData();
        alert('✅ Caja actualizada exitosamente');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error al actualizar caja:', error);
      alert('❌ Error al actualizar caja');
      return false;
    }
  };

  const handleDelete = async (ids: number[]): Promise<boolean> => {
    if (!user?.usuario.id) return false;

    try {
      // Desactivar en lugar de eliminar
      await Promise.all(
        ids.map(id =>
          call('cajas', 'update', {
            id,
            activo: false,
            usuario_id: user.usuario.id
          })
        )
      );

      await reloadData();
      alert(`✅ ${ids.length === 1 ? 'Caja desactivada' : 'Cajas desactivadas'} exitosamente`);
      return true;
    } catch (error) {
      console.error('Error al desactivar cajas:', error);
      alert('❌ Error al desactivar cajas');
      return false;
    }
  };

  // ==================== VALIDACIÓN ====================
  const validate = (data: Caja): Record<string, string> => {
    const errors: Record<string, string> = {};

    if (!data.nombre.trim()) {
      errors.nombre = 'El nombre es requerido';
    }

    if (!data.almacen_id) {
      errors.almacen_id = 'Selecciona un almacén';
    }

    return errors;
  };

  // ==================== CONFIGURACIÓN DE CAMPOS ====================
  const getFormFields = (data: Caja | null, mode: 'create' | 'edit' | 'view'): InputConfig[] => {
    const isView = mode === 'view';
    const values = data || INITIAL_VALUES;

    return [
      {
        name: 'nombre',
        label: 'Nombre de la caja',
        type: 'text',
        value: values.nombre,
        placeholder: 'Ej: Caja Principal',
        required: true,
        disabled: isView,
        icon: <CreditCard />,
        col: 2,
      },
      {
        name: 'almacen_id',
        label: 'Almacén',
        type: 'select',
        value: values.almacen_id,
        placeholder: 'Selecciona un almacén',
        required: true,
        disabled: isView,
        icon: <Building />,
        options: almacenes.map(a => ({
          label: a.nombre,
          value: a.id as number
        })),
        col: 2,
        hint: 'Almacén al que pertenece la caja'
      },
      {
        name: 'activo',
        label: 'Caja activa',
        type: 'checkbox',
        value: values.activo,
        disabled: isView,
        col: 4,
      },
    ];
  };

  // ==================== CONFIGURACIÓN DEL CRUD ====================
  const crudConfig: CRUDConfig<any> = useMemo(() => ({
    // Información básica
    title: 'Gestión de Cajas',
    subtitle: 'Administra las cajas del sistema',
    entityName: 'caja',
    entityNamePlural: 'cajas',

    // Datos
    data: cajas,

    // Cards
    cards: [
      {
        title: 'Total de cajas',
        value: cajas.length,
        icon: <CreditCard />,
      },
      {
        title: 'Cajas activas',
        value: cajas.filter(c => c.activo).length,
        icon: <CreditCard />,
      },
      {
        title: 'Cajas inactivas',
        value: cajas.filter(c => !c.activo).length,
        icon: <CreditCard />,
      },
    ],

    // Columnas de tabla
    columns: [
      { key: 'id', label: 'ID' },
      { key: 'nombre', label: 'Nombre' },
      {
        key: 'almacen_nombre',
        label: 'Almacén',
        render: (data) => (
          <span className="badge badge-info badge-sm">
            {data || 'Sin almacén'}
          </span>
        )
      },
      {
        key: 'activo',
        label: 'Estado',
        render: (data) => (
          <span className={`badge badge-${data ? 'success' : 'error'} badge-xs`}>
            {data ? 'Activa' : 'Inactiva'}
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
      modulo: 'caja',
      crear: true,
      editar: true,
      eliminar: true,
      ver: true,
    },

    // Configuración
    selectable: true,
    itemsPerPage: 10,
    showCards: true,
    tableIcon: <CreditCard />,
  }), [cajas, almacenes]);

  // ==================== RENDER ====================
  return <CRUDManager config={crudConfig} />;
};

export default Cajas;