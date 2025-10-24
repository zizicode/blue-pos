import React, { useState } from 'react';
import CRUDManager, { CRUDConfig } from '@renderer/components/CRUDManager/CRUDManager';
import { usePOSStore } from '@renderer/store/usePOSStore';
import { useAuthStore } from '@renderer/store/auth';
import { usePriceInput, useNumberInput } from '@renderer/hooks/usePriceInput';
import { api } from '@renderer/services/api';
import { useInitializePOSData } from '@renderer/hooks/useInitializePOSData';

export interface Producto {
  id?: number;
  codigo: string;
  codigo_barras?: string;
  nombre: string;
  descripcion?: string;
  categoria_id?: number | null;
  categoria_nombre?: string;
  unidad_medida_id?: number | null;
  unidad_medida_nombre?: string;
  proveedor_id?: number | null;
  proveedor_nombre?: string;
  precio_compra: number;
  precio_venta: number;
  stock_minimo: number;
  stock_actual: number;
  activo: boolean;
  imagen_url?: string;
  creado_en?: string;
  actualizado_en?: string;
}

const PRODUCTO_INICIAL: Producto = {
  codigo: '',
  codigo_barras: '',
  nombre: '',
  descripcion: '',
  categoria_id: null,
  categoria_nombre: '',
  unidad_medida_id: null,
  unidad_medida_nombre: '',
  proveedor_id: null,
  proveedor_nombre: '',
  precio_compra: 0,
  precio_venta: 0,
  stock_minimo: 0,
  stock_actual: 0,
  activo: true,
  imagen_url: '',
};

const Productos: React.FC = () => {
  const usuario_id = useAuthStore((state) => state.user?.usuario.id) as number;
  const { productos } = usePOSStore();
  const {syncAllData} = useInitializePOSData();
  const [loading, setLoading] = useState(false);

  const precioCompra = usePriceInput(PRODUCTO_INICIAL.precio_compra, { decimals: 2, minValue: 0 });
  const precioVenta = usePriceInput(PRODUCTO_INICIAL.precio_venta, { decimals: 2, minValue: 0 });
  const stockMinimo = useNumberInput(PRODUCTO_INICIAL.stock_minimo, { decimals: 0, minValue: 0 });
  const stockActual = useNumberInput(PRODUCTO_INICIAL.stock_actual, { decimals: 0, minValue: 0 });

  // Sincronizar hooks numéricos con estado
  React.useEffect(() => { precioCompra.setValue(PRODUCTO_INICIAL.precio_compra); }, [PRODUCTO_INICIAL.precio_compra]);
  React.useEffect(() => { precioVenta.setValue(PRODUCTO_INICIAL.precio_venta); }, [PRODUCTO_INICIAL.precio_venta]);
  React.useEffect(() => { stockMinimo.setValue(PRODUCTO_INICIAL.stock_minimo); }, [PRODUCTO_INICIAL.stock_minimo]);
  React.useEffect(() => { stockActual.setValue(PRODUCTO_INICIAL.stock_actual); }, [PRODUCTO_INICIAL.stock_actual]);

  // ================== CONFIG CRUD ==================
  const crudConfig: CRUDConfig<Producto> = {
    title: 'Productos',
    subtitle: 'Gestión de productos',
    entityName: 'producto',
    entityNamePlural: 'productos',
    data: productos || [],
    loading,
    initialValues: PRODUCTO_INICIAL,
    columns: [
      { label: 'Código', key: 'codigo' },
      { label: 'Nombre', key: 'nombre' },
      { label: 'Precio', key: 'precio_venta', render: (p) => `RD$ ${p.precio_venta}` },
      { label: 'Stock', key: 'stock_actual' },
      { label: 'Estado', key: 'activo', render: (p) => p.activo ? 'Activo' : 'Inactivo' },
    ],
    formFields: (data, mode) => [
      { name: 'codigo', label: 'Código', type: 'text', value: data?.codigo ?? '', disabled: mode === 'view' },
      { name: 'nombre', label: 'Nombre', type: 'text', value: data?.nombre ?? '', required: true, disabled: mode === 'view' },
      { name: 'precio_venta', label: 'Precio venta', type: 'number', value: data?.precio_venta ?? 0, disabled: mode === 'view' },
      { name: 'stock_actual', label: 'Stock', type: 'number', value: data?.stock_actual ?? 0, disabled: mode === 'view' },
    ],
    onCreate: async (data) => {
      setLoading(true);
      try {
        await api('productos', 'create', { ...data, usuario_id });
        await syncAllData(usuario_id);
        return true;
      } catch (err) { return false; }
      finally { setLoading(false); }
    },
    onUpdate: async (id, data) => {
      setLoading(true);
      try {
        await api('productos', 'update', { ...data, id, usuario_id });
        await syncAllData(usuario_id);
        return true;
      } catch { return false; } finally { setLoading(false); }
    },
    onDelete: async (ids) => {
      if (!confirm(`¿Eliminar ${ids.length} productos?`)) return false;
      setLoading(true);
      try {
        for (const id of ids) {
          await api('productos', 'delete', { id, usuario_id });
        }
        await syncAllData(usuario_id);
        return true;
      } catch { return false; } finally { setLoading(false); }
    },
    permissions: {modulo: 'productos', crear: true, editar: true, eliminar: true, ver: true },
    validate: (data) => {
      const errors: Record<string, string> = {};
      if (!data.nombre) errors.nombre = 'Nombre es obligatorio';
      return errors;
    },
    selectable: true,
    itemsPerPage: 10,
  };

  // ================== RENDER ==================
  return (
    <div className="Productos">
      <CRUDManager config={crudConfig} />
    </div>
  );
};

export default Productos;
