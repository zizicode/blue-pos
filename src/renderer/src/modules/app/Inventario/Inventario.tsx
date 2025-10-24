import React, { useState, useEffect, useMemo, ReactNode } from 'react';
import { ArrowLeftRight, Delete, Edit, Package, Plus, Shirt, View } from 'lucide-react';
import Head, { type buttonHead } from '@renderer/components/Head/Head';
import StartCard, { type Card } from '@renderer/components/StatCard/StartCard';
import { ActionButton, DataTable, type DataTableColumn } from '@renderer/components/DataTable/DataTable';
import BottomModal from '@renderer/components/BottomModal/BottomModal';
import DynamicForm, { type FormField } from '@renderer/components/DinamicForm/DynamicForm';
import { usePOSStore } from '@renderer/store/usePOSStore';
import { useAuthStore } from '@renderer/store/auth';
import Stocks, { type Ajuste } from './Stocks/Stocks';
import Transferencia, { type Transferencia as TransferenciaType } from './Transferencia/Transferencia';
import { useApi } from '@renderer/services/useApi';
import { useInitializePOSData } from '@renderer/hooks/useInitializePOSData';
import { generateFormFields } from '@renderer/utils/formHelpers';

// ==================== TIPOS ====================
interface AlmacenRow {
  id: number;
  nombre: string;
  direccion: string;
  telefono: string;
  estado: ReactNode;
  stock: number;
  creado: string;
}

// ==================== CONSTANTES ====================
const DEFAULT_SCHEMA: FormField[] = generateFormFields({
  nombre: '',
  direccion: '',
  telefono: '',
  es_principal: true,
  activo: true,
});

const EDIT_FIELD_OVERRIDES = {
  activo: 'checkbox' as const,
  es_principal: 'checkbox' as const
};

const TABLE_COLUMNS: DataTableColumn[] = [
  { key: 'id', label: 'ID' },
  { key: 'nombre', label: 'Nombre' },
  { key: 'direccion', label: 'Dirección' },
  { key: 'telefono', label: 'Teléfono' },
  { key: 'estado', label: 'Estado' },
  { key: 'stock', label: 'Stock' },
  { key: 'creado', label: 'Creado' },
];

// ==================== HELPERS ====================
const badge = (variant: 'success' | 'error', label: string) => (
  <span className={`badge badge-${variant} badge-xs`}>{label}</span>
);

const formValues = <T extends { key: string; value: any }>(data: T[]) => {
  return data.reduce((acc, curr) => {
    acc[curr.key] = curr.value;
    return acc;
  }, {} as Record<string, any>);
};

// ==================== HOOKS PERSONALIZADOS ====================
const useInventarioModals = () => {
  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [openView, setOpenView] = useState(false);
  const [openAjuste, setOpenAjuste] = useState(false);
  const [openTransf, setOpenTransf] = useState(false);

  return {
    modals: { openCreate, openEdit, openView, openAjuste, openTransf },
    setters: { setOpenCreate, setOpenEdit, setOpenView, setOpenAjuste, setOpenTransf }
  };
};

const useInventarioForms = () => {
  const [createFields, setCreateFields] = useState<FormField[]>(DEFAULT_SCHEMA);
  const [editFields, setEditFields] = useState<FormField[]>(DEFAULT_SCHEMA);
  const [viewFields, setViewFields] = useState<FormField[]>(DEFAULT_SCHEMA);

  const updateField = (
    setter: React.Dispatch<React.SetStateAction<FormField[]>>,
    key: string,
    value: any
  ) => {
    setter(prev => prev.map(f => (f.key === key ? { ...f, value } : f)));
  };

  return {
    forms: { createFields, editFields, viewFields },
    setters: { setCreateFields, setEditFields, setViewFields },
    updateField
  };
};

// ==================== COMPONENTE PRINCIPAL ====================
const Inventario: React.FC = () => {
  // Estados
  const [cards, setCards] = useState<Card[]>([]);
  const [tableData, setTableData] = useState<AlmacenRow[]>([]);
  const [dataAjuste, setDataAjuste] = useState<Partial<Ajuste>>({});
  const [dataTransferencia, setDataTransferencia] = useState<Partial<TransferenciaType>>({});

  // Hooks personalizados
  const { modals, setters } = useInventarioModals();
  const { forms, setters: formSetters, updateField } = useInventarioForms();

  // Store y servicios
  const { almacenes, productos } = usePOSStore();
  const { user } = useAuthStore();
  const { call } = useApi();
  const { loadAllData } = useInitializePOSData();

  // ==================== HANDLERS DE API ====================
  const getStockForStore = async (almacenId: number) => {
    const { success, data } = await call('stock', 'getPorAlmacen', { almacen_id: almacenId });
    return success ? data : [];
  };

  const reloadData = async () => {
    if (user?.usuario.id) {
      await loadAllData(user.usuario.id);
    }
  };

  // ==================== HANDLERS DE ALMACENES ====================
  const handleCreate = async () => {
    if (!user?.usuario.id) return;

    const payload = { ...formValues(forms.createFields as []), usuario_id: user.usuario.id };
    const result = await call('almacenes', 'create', payload);

    if (result?.success) {
      await reloadData();
      setters.setOpenCreate(false);
      formSetters.setCreateFields(DEFAULT_SCHEMA);
    }
  };

  const handleEdit = async (selectedRows: any[]) => {
    const almacen = almacenes.find(a => a.id === selectedRows[0]?.id);
    if (!almacen) return;

    const { id, creado_en, actualizado_en, ...editableData } = almacen;
    formSetters.setEditFields(generateFormFields(editableData, EDIT_FIELD_OVERRIDES));
    setters.setOpenEdit(true);
  };

  const handleSaveEdit = async () => {
    if (!user?.usuario.id) return;

    const payload = { ...formValues(forms.editFields as []), usuario_id: user.usuario.id };
    const result = await call('almacenes', 'update', payload);

    if (result?.success) {
      await reloadData();
      setters.setOpenEdit(false);
    }
  };

  const handleDelete = async (selectedRows: any[]) => {
    if (!confirm('¿Estás seguro que deseas eliminar?')) return;
    if (!user?.usuario.id) return;

    await Promise.all(
      selectedRows.map(row =>
        call('almacenes', 'delete', { id: row.id, usuario_id: user.usuario.id })
      )
    );

    await reloadData();
  };

  // ==================== HANDLERS DE AJUSTE ====================
  const handleAjusteApply = async () => {
    if (!user?.usuario.id) return;

    const payload = { ...dataAjuste, usuario_id: user.usuario.id };

    try {
      await call('stock', 'ajustar', payload);
      await reloadData();
      setters.setOpenAjuste(false);
      setDataAjuste({});
    } catch (error) {
      console.error('Error al aplicar ajuste:', error);
    }
  };

  // ==================== HANDLERS DE TRANSFERENCIA ====================
  const handleTransferenciaApply = async () => {
    if (!user?.usuario.id) return;

    // Validaciones
    if (!dataTransferencia.almacen_origen_id) {
      alert('Selecciona un almacén de origen');
      return;
    }
    if (!dataTransferencia.almacen_destino_id) {
      alert('Selecciona un almacén de destino');
      return;
    }
    if (!dataTransferencia.detalles || dataTransferencia.detalles.length === 0) {
      alert('Agrega al menos un producto');
      return;
    }

    // Validar que todos los detalles tengan producto y cantidad
    const detallesValidos = dataTransferencia.detalles.every(
      d => d.producto_id && d.cantidad > 0
    );

    if (!detallesValidos) {
      alert('Todos los productos deben tener un producto seleccionado y cantidad mayor a 0');
      return;
    }

    // Limpiar tempId de los detalles antes de enviar
    const detallesLimpios = dataTransferencia.detalles.map(({ tempId, ...resto }) => resto);

    const payload = {
      almacen_origen_id: dataTransferencia.almacen_origen_id,
      almacen_destino_id: dataTransferencia.almacen_destino_id,
      notas: dataTransferencia.notas || '',
      usuario_id: user.usuario.id,
      detalles: detallesLimpios
    };

    try {
      const result = await call('transferencias', 'create', payload);
      
      if (result?.success) {
        await reloadData();
        setters.setOpenTransf(false);
        setDataTransferencia({});
        alert('Transferencia realizada exitosamente');
      }
    } catch (error) {
      console.error('Error al realizar transferencia:', error);
      alert('Error al realizar la transferencia');
    }
  };

  // ==================== CARGA DE DATOS ====================
  useEffect(() => {
    if (!almacenes?.length) {
      setCards([]);
      setTableData([]);
      return;
    }

    const loadAlmacenesData = async () => {
      const results = await Promise.all(
        almacenes.map(async almacen => {
          const stock = await getStockForStore(almacen.id as number);
          const fechaISO = new Date(almacen.creado_en ?? '').toISOString().split('T')[0];

          return {
            card: {
              ...(almacen.es_principal && {
                badge: { label: 'Principal', className: 'badge badge-success badge-xs' },
              }),
              subValue: 'Stock',
              icon: <Package />,
              title: almacen.nombre,
              value: stock.length ?? 0,
              private: { modulo: 'inventario', accion: 'ver' },
            } as Card,
            row: {
              id: almacen.id,
              nombre: almacen.nombre,
              direccion: almacen.direccion,
              telefono: almacen.telefono || '--',
              estado: almacen.activo ? badge('success', 'Activo') : badge('error', 'Inactivo'),
              stock: stock.length,
              creado: fechaISO,
            } as AlmacenRow,
          };
        })
      );

      setCards(results.map(r => r.card));
      setTableData(results.map(r => r.row));
    };

    loadAlmacenesData();
  }, [almacenes]);

  // ==================== CONFIGURACIÓN DE UI ====================
  const headerButtons: buttonHead[] = useMemo(
    () => [
      {
        label: 'Crear Almacén',
        icon: <Plus size={16} />,
        private: { module: 'inventario', action: 'ver' },
        className: 'btn btn-sm btn-primary',
        onClick: () => setters.setOpenCreate(true),
      },
      {
        label: 'Ajuste de stock',
        icon: <Shirt size={16} />,
        private: { module: 'inventario', action: 'ver' },
        className: 'btn btn-sm btn-success',
        onClick: () => setters.setOpenAjuste(true),
        disabled: productos.length <= 0 
      },
      {
        label: 'Transferir',
        icon: <ArrowLeftRight size={16} />,
        private: { module: 'inventario', action: 'ver' },
        className: 'btn btn-sm btn-warning',
        onClick: () => setters.setOpenTransf(true),
        disabled: almacenes.length < 2
      }
    ],
    []
  );

  const actionButtons: ActionButton[] = [
    {
      label: 'Ver detalle',
      icon: <View size={15} />,
      variant: 'secondary',
      showWhen: 'single',
      permission: { modulo: 'inventario', accion: 'ver' },
      onClick: (rows) => {
        const almacen = almacenes.find(a => a.id === rows[0]?.id);
        if (almacen) {
          formSetters.setViewFields(generateFormFields(almacen));
          setters.setOpenView(true);
        }
      },
    },
    {
      label: 'Editar',
      icon: <Edit size={15} />,
      variant: 'primary',
      showWhen: 'single',
      permission: { modulo: 'inventario', accion: 'ver' },
      onClick: handleEdit,
    },
    {
      label: 'Eliminar',
      icon: <Delete size={15} />,
      variant: 'danger',
      showWhen: 'any',
      permission: { modulo: 'inventario', accion: 'ver' },
      onClick: handleDelete,
    },
  ];

  // ==================== RENDER ====================
  return (
    <div>
      <Head
        title="Inventario"
        subtitle="Gestiona tus almacenes y productos"
        buttons={headerButtons}
      />

      {cards.length ? (
        <StartCard cards={cards} />
      ) : (
        <div className="alert alert-warning">
          <h3>Necesitas crear un almacén</h3>
          <p>Para crear productos y vender, primero crea un almacén.</p>
        </div>
      )}

      <DataTable
        data={tableData}
        columns={TABLE_COLUMNS}
        itemsPerPage={5}
        title="Tabla de almacenes"
        icon={<Package />}
        actionButtonsWithSelection={actionButtons}
        userPermissions={user?.permisos}
        selectable
      />

      {/* Modal de crear */}
      <BottomModal
        isOpen={modals.openCreate}
        onClose={() => setters.setOpenCreate(false)}
        actions={
          <button onClick={handleCreate} className="btn btn-success">
            Crear Almacén
          </button>
        }
      >
        <DynamicForm
          mode="create"
          title="Crear un almacén"
          schema={forms.createFields}
          onChange={(key, value) => updateField(formSetters.setCreateFields, key, value)}
        />
      </BottomModal>

      {/* Modal de editar */}
      <BottomModal
        isOpen={modals.openEdit}
        onClose={() => setters.setOpenEdit(false)}
        actions={
          <>
            <button className="btn btn-secondary" onClick={() => setters.setOpenEdit(false)}>
              Cancelar
            </button>
            <button className="btn btn-primary" onClick={handleSaveEdit}>
              Guardar
            </button>
          </>
        }
      >
        <DynamicForm
          mode="edit"
          title="Editar almacén"
          schema={forms.editFields}
          onChange={(key, value) => updateField(formSetters.setEditFields, key, value)}
        />
      </BottomModal>

      {/* Modal de ver */}
      <BottomModal
        isOpen={modals.openView}
        onClose={() => setters.setOpenView(false)}
      >
        <DynamicForm
          mode="view"
          title="Detalle de almacén"
          schema={forms.viewFields}
        />
      </BottomModal>

      {/* Modal de ajuste de stock */}
      <BottomModal
        isOpen={modals.openAjuste}
        onClose={() => setters.setOpenAjuste(false)}
        actions={
          <>
            <button className="btn btn-success" onClick={handleAjusteApply}>
              Aplicar ajuste
            </button>
            <button className="btn btn-secondary" onClick={() => setters.setOpenAjuste(false)}>
              Cancelar
            </button>
          </>
        }
      >
        <form onSubmit={(e) => e.preventDefault()}>
          <Stocks onChange={setDataAjuste} />
        </form>
      </BottomModal>

      {/* Modal de transferencia */}
      <BottomModal
        isOpen={modals.openTransf}
        onClose={() => setters.setOpenTransf(false)}
        actions={
          <>
            <button className="btn btn-warning" onClick={handleTransferenciaApply}>
              Transferir
            </button>
            <button className="btn btn-secondary" onClick={() => setters.setOpenTransf(false)}>
              Cancelar
            </button>
          </>
        }
      >
        <Transferencia onChange={setDataTransferencia} />
      </BottomModal>
    </div>
  );
};

export default Inventario;