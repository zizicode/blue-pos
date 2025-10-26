import React, { useState, useMemo } from 'react';
import { Plus, Edit, Eye, Delete, Loader } from 'lucide-react';
import Head, { buttonHead } from '@renderer/components/Head/Head';
import StartCard, { Card } from '@renderer/components/StatCard/StartCard';
import { ActionButton, DataTable, DataTableColumn } from '@renderer/components/DataTable/DataTable';
import BottomModal from '@renderer/components/BottomModal/BottomModal';
import FormInput, { InputConfig } from '@renderer/components/FormsInputs/FormsInputs';
import './CRUDManager.scss';

// ==================== TIPOS ====================
export interface CRUDConfig<T = any> {
  // Información básica
  title: string;
  subtitle: string;
  entityName: string; // "usuario", "producto", etc.
  entityNamePlural: string; // "usuarios", "productos", etc.

  // Datos
  data: T[];
  loading?: boolean;

  // Configuración de tabla
  columns: DataTableColumn[];
  cards?: Card[];

  // Configuración de formulario
  formFields: (data: T | null, mode: 'create' | 'edit' | 'view') => InputConfig[];
  initialValues: T;

  // Handlers
  onCreate?: (data: T) => Promise<boolean>;
  onUpdate?: (id: any, data: T) => Promise<boolean>;
  onDelete?: (ids: any[]) => Promise<boolean>;
  onView?: (data: T) => void;

  // Acciones personalizadas
  customActions?: ActionButton[];
  headerButtons?: buttonHead[];

  // Permisos
  permissions?: {
    modulo: string;
    crear?: boolean;
    editar?: boolean;
    eliminar?: boolean;
    ver?: boolean;
  };

  // Configuración adicional
  searchable?: boolean;
  selectable?: boolean;
  itemsPerPage?: number;
  showCards?: boolean;
  tableIcon?: React.ReactNode;
  showDateFilter?: boolean;
  dateFilterColumn?: string;
  onFilteredDataChange?: (filteredData: T[]) => void


  // Validación
  validate?: (data: T, mode: 'create' | 'edit') => Record<string, string>;

  // Callbacks
  onModalOpen?: (mode: 'create' | 'edit' | 'view', data?: T) => void;
  onModalClose?: (mode: 'create' | 'edit' | 'view') => void;
}

interface CRUDManagerProps<T = any> {
  config: CRUDConfig<T>;
}

// ==================== COMPONENTE ====================
function CRUDManager<T extends Record<string, any>>({ config }: CRUDManagerProps<T>) {
  // Estados
  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [openView, setOpenView] = useState(false);
  const [formData, setFormData] = useState<T>(config.initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  // ==================== HELPERS ====================
  const resetForm = () => {
    setFormData(config.initialValues);
    setErrors({});
  };

  const validateForm = (mode: 'create' | 'edit'): boolean => {
    if (!config.validate) return true;

    const newErrors = config.validate(formData, mode);
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ==================== HANDLERS ====================
  const handleChange = (name: string, rawValue: any, type?: string) => {
    let value = rawValue;

    // Si es number: aplicar normalización
    if (type === "number") {
      let num = String(rawValue);

      // Evitar ceros iniciales en números (05 -> 5)
      if (/^0\d+/.test(num)) {
        num = num.replace(/^0+/, "");
      }

      value = num === "" ? "" : Number(num);
    }

    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Limpiar error si lo había
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  // CREAR
  const handleCreate = async () => {
    if (!validateForm('create')) return;
    if (!config.onCreate) return;

    setLoading(true);
    try {
      const success = await config.onCreate(formData);
      if (success) {
        resetForm();
        setOpenCreate(false);
      }
    } finally {
      setLoading(false);
    }
  };

  // EDITAR
  const handleEdit = (rows: any[]) => {
    const item = config.data.find(d => d.id === rows[0]?.id);
    if (!item) return;

    setFormData(item);
    config.onModalOpen?.('edit', item);
    setOpenEdit(true);
  };

  const handleSaveEdit = async () => {
    if (!validateForm('edit')) return;
    if (!config.onUpdate) return;

    setLoading(true);
    try {
      const success = await config.onUpdate(formData.id, formData);
      if (success) {
        resetForm();
        setOpenEdit(false);
      }
    } finally {
      setLoading(false);
    }
  };

  // VER
  const handleView = (rows: any[]) => {
    const item = config.data.find(d => d.id === rows[0]?.id);
    if (!item) return;

    setFormData(item);
    config.onModalOpen?.('view', item);
    config.onView?.(item);
    setOpenView(true);
  };

  // ELIMINAR
  const handleDelete = async (rows: any[]) => {
    if (!config.onDelete) return;

    const count = rows.length;
    const message = count === 1
      ? `¿Estás seguro de eliminar este ${config.entityName}?`
      : `¿Estás seguro de eliminar ${count} ${config.entityNamePlural}?`;

    if (!confirm(message)) return;

    setLoading(true);
    try {
      const ids = rows.map(r => r.id);
      await config.onDelete(ids);
    } finally {
      setLoading(false);
    }
  };

  // ==================== CONFIGURACIÓN DE UI ====================
  const headerButtons = useMemo<buttonHead[]>(() => {
    const buttons: buttonHead[] = [];

    // Botón crear por defecto
    if (config.onCreate && config.permissions?.crear !== false) {
      buttons.push({
        label: `Crear ${config.entityName}`,
        icon: <Plus size={16} />,
        className: 'btn btn-sm btn-success',
        onClick: () => {
          resetForm();
          config.onModalOpen?.('create');
          setOpenCreate(true);
        },
      });
    }

    // Botones personalizados
    if (config.headerButtons) {
      buttons.push(...config.headerButtons);
    }

    return buttons;
  }, [config]);

  const actionButtons = useMemo<ActionButton[]>(() => {
    const buttons: ActionButton[] = [];

    // Ver
    if (config.permissions?.ver !== false) {
      buttons.push({
        label: 'Ver detalles',
        icon: <Eye size={15} />,
        variant: 'secondary',
        showWhen: 'single',
        onClick: handleView,
      });
    }

    // Editar
    if (config.onUpdate && config.permissions?.editar !== false) {
      buttons.push({
        label: 'Editar',
        icon: <Edit size={15} />,
        variant: 'primary',
        showWhen: 'single',
        onClick: handleEdit,
      });
    }

    // Eliminar
    if (config.onDelete && config.permissions?.eliminar !== false) {
      buttons.push({
        label: 'Eliminar',
        icon: <Delete size={15} />,
        variant: 'danger',
        showWhen: 'any',
        onClick: handleDelete,
      });
    }

    // Acciones personalizadas
    if (config.customActions) {
      buttons.push(...config.customActions);
    }

    return buttons;
  }, [config, formData]);

  // ==================== RENDER ====================
  return (
    <div className="CRUDManager">
      {/* Header */}
      <Head
        title={config.title}
        subtitle={config.subtitle}
        buttons={headerButtons}
      />

      {/* Cards estadísticas */}
      {config.showCards !== false && config.cards && (
        <StartCard cards={config.cards} />
      )}

      {/* Loading overlay */}
      {config.loading && (
        <div className="CRUDManager__loading-overlay">
          <Loader size={32} className="spin" />
          <p>Cargando datos...</p>
        </div>
      )}

      {/* Tabla */}
      <DataTable
        title={`Tabla de ${config.entityNamePlural}`}
        columns={config.columns}
        data={config.data}
        selectable={config.selectable !== false}
        actionButtonsWithSelection={actionButtons}
        itemsPerPage={config.itemsPerPage || 10}
        icon={config.tableIcon}
        showDateFilter={config.showDateFilter ?? false}
        dateFilterColumn={config.dateFilterColumn ?? ''}
        onFilteredDataChange={config.onFilteredDataChange}
      />

      {/* Modal CREAR */}
      {config.onCreate && (
        <BottomModal
          isOpen={openCreate}
          onClose={() => {
            resetForm();
            config.onModalClose?.('create');
            setOpenCreate(false);
          }}
          actions={
            <>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  resetForm();
                  setOpenCreate(false);
                }}
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-success"
                onClick={handleCreate}
                disabled={loading}
              >
                {loading ? 'Creando...' : `Crear ${config.entityName}`}
              </button>
            </>
          }
        >
          <div className="CRUDManager__modal-content">
            <div className="CRUDManager__modal-header">
              <Plus size={24} />
              <h3>Crear {config.entityName}</h3>
            </div>

            <FormInput
              inputs={config.formFields(formData, 'create').map(field => ({
                ...field,
                error: errors[field.name]
              }))}
              onChange={(name, value, type) => handleChange(name, value, type)}
              columns={4}
              gap="md"
            />
          </div>
        </BottomModal>
      )}

      {/* Modal EDITAR */}
      {config.onUpdate && (
        <BottomModal
          isOpen={openEdit}
          onClose={() => {
            resetForm();
            config.onModalClose?.('edit');
            setOpenEdit(false);
          }}
          actions={
            <>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  resetForm();
                  setOpenEdit(false);
                }}
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSaveEdit}
                disabled={loading}
              >
                {loading ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </>
          }
        >
          <div className="CRUDManager__modal-content">
            <div className="CRUDManager__modal-header">
              <Edit size={24} />
              <h3>Editar {config.entityName}</h3>
            </div>

            <FormInput
              inputs={config.formFields(formData, 'edit').map(field => ({
                ...field,
                error: errors[field.name]
              }))}
              onChange={handleChange}
              columns={4}
              gap="md"
            />
          </div>
        </BottomModal>
      )}

      {/* Modal VER */}
      <BottomModal
        isOpen={openView}
        onClose={() => {
          resetForm();
          config.onModalClose?.('view');
          setOpenView(false);
        }}
      >
        <div className="CRUDManager__modal-content">
          <div className="CRUDManager__modal-header">
            <Eye size={24} />
            <h3>Detalles de {config.entityName}</h3>
          </div>

          <FormInput
            inputs={config.formFields(formData, 'view')}
            onChange={() => { }}
            columns={4}
            gap="md"
          />
        </div>
      </BottomModal>
    </div>
  );
}

export default CRUDManager;