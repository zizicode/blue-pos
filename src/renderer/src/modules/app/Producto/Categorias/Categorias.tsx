import React, { useMemo } from 'react';
import { FolderKanban, FileText } from 'lucide-react';
import { usePOSStore } from '@renderer/store/usePOSStore';
import { useApi } from '@renderer/services/useApi';
import { useAuthStore } from '@renderer/store/auth';
import { useInitializePOSData } from '@renderer/hooks/useInitializePOSData';
import CRUDManager, { CRUDConfig } from '@renderer/components/CRUDManager/CRUDManager';
import { InputConfig } from '@renderer/components/FormsInputs/FormsInputs';

// ==================== TIPOS ====================
interface Categoria {
  id?: number;
  nombre: string;
  descripcion: string;
  activo: boolean;
  creado_en?: string;
  actualizado_en?: string;
}

// ==================== VALORES INICIALES ====================
const INITIAL_VALUES: Categoria = {
  nombre: '',
  descripcion: '',
  activo: true,
};

// ==================== COMPONENTE ====================
const Categorias: React.FC = () => {
  const { categorias } = usePOSStore();
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
  const handleCreate = async (data: Categoria): Promise<boolean> => {
    if (!user?.usuario.id) return false;

    try {
      const payload = {
        nombre: data.nombre,
        descripcion: data.descripcion as string,
        usuario_id: user.usuario.id,
      };

      const result = await call('categorias', 'create', payload);

      if (result?.success) {
        await reloadData();
        alert('✅ Categoría creada exitosamente');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error al crear categoría:', error);
      alert('❌ Error al crear categoría');
      return false;
    }
  };

  const handleUpdate = async (id: number, data: Categoria): Promise<boolean> => {
    if (!user?.usuario.id) return false;

    try {
      const payload = {
        id,
        nombre: data.nombre,
        descripcion: data.descripcion as string,
        activo: data.activo,
        usuario_id: user.usuario.id,
      };

      const result = await call('categorias', 'update', payload);

      if (result?.success) {
        await reloadData();
        alert('✅ Categoría actualizada exitosamente');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error al actualizar categoría:', error);
      alert('❌ Error al actualizar categoría');
      return false;
    }
  };

  const handleDelete = async (ids: number[]): Promise<boolean> => {
    if (!user?.usuario.id) return false;

    try {
      const result: any = await Promise.all(
        ids.map(id =>
          call('categorias', 'delete', {
            id,
            usuario_id: user.usuario.id
          })
        )
      );

      await reloadData();
      if(result.success) alert(`✅ ${ids.length === 1 ? 'Categoría eliminada' : 'Categorías eliminadas'} exitosamente`)
      return true;
    } catch (error) {
      console.error('Error al eliminar categorías:', error);
      alert('❌ Error al eliminar categorías');
      return false;
    }
  };

  // ==================== VALIDACIÓN ====================
  const validate = (data: Categoria): Record<string, string> => {
    const errors: Record<string, string> = {};

    if (!data.nombre.trim()) {
      errors.nombre = 'El nombre es requerido';
    }

    if (!data.descripcion.trim()) {
      errors.descripcion = 'La descripción es requerida';
    }

    return errors;
  };

  // ==================== CONFIGURACIÓN DE CAMPOS ====================
  const getFormFields = (data: Categoria | null, mode: 'create' | 'edit' | 'view'): InputConfig[] => {
    const isView = mode === 'view';
    const values = data || INITIAL_VALUES;

    return [
      {
        name: 'nombre',
        label: 'Nombre de la categoría',
        type: 'text',
        value: values.nombre,
        placeholder: 'Ej: Bebidas',
        required: true,
        disabled: isView,
        icon: <FolderKanban />,
        col: 4,
      },
      {
        name: 'descripcion',
        label: 'Descripción',
        type: 'textarea',
        value: values.descripcion,
        placeholder: 'Describe la categoría...',
        required: true,
        disabled: isView,
        icon: <FileText />,
        col: 4,
        hint: 'Breve descripción de la categoría'
      },
    ];
  };

  // ==================== CONFIGURACIÓN DEL CRUD ====================
  const crudConfig: CRUDConfig<any> = useMemo(() => ({
    // Información básica
    title: 'Gestión de Categorías',
    subtitle: 'Administra las categorías de productos',
    entityName: 'categoría',
    entityNamePlural: 'categorías',


    // Datos
    data: categorias,

    // Cards
    cards: [
      {
        title: 'Total de categorías',
        value: categorias.length,
        icon: <FolderKanban />,
      },
      {
        title: 'Categorías activas',
        value: categorias.filter(c => c.activo).length,
        icon: <FolderKanban />,
      },
      {
        title: 'Categorías inactivas',
        value: categorias.filter(c => !c.activo).length,
        icon: <FolderKanban />,
      },
    ],

    // Columnas de tabla
    columns: [
      { key: 'id', label: 'ID' },
      { key: 'nombre', label: 'Nombre' },
      { 
        key: 'descripcion', 
        label: 'Descripción',
        render: (data) => (
          <span className="text-sm text-gray-600" title={data}>
            {data.length > 50 ? data.substring(0, 50) + '...' : data}
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
      modulo: 'categoria',
      crear: true,
      editar: true,
      eliminar: true,
      ver: true,
    },

    // Configuración
    selectable: true,
    itemsPerPage: 10,
    showCards: true,
    tableIcon: <FolderKanban />,
  }), [categorias]);

  // ==================== RENDER ====================
  return <CRUDManager config={crudConfig} />;
};

export default Categorias;