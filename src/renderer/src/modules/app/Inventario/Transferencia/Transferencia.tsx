import React, { useState, useCallback } from 'react';
import { Plus, Trash2, Package } from 'lucide-react';
import SearchSelect from '@renderer/components/SearchSelectProps/SearchSelectProps';
import { NumberInput } from '@renderer/components/FormatNumberInput/InputNumber';
import { usePOSStore } from '@renderer/store/usePOSStore';
import './Transferencia.scss';

// ==================== TIPOS ====================
export interface DetalleTransferencia {
  producto_id: number | null;
  cantidad: number;
  tempId: string; // ID temporal para React keys
}

export interface Transferencia {
  almacen_origen_id: number | null;
  almacen_destino_id: number | null;
  notas: string;
  detalles: DetalleTransferencia[];
}

interface TransferenciaProps {
  onChange: (data: Transferencia) => void;
  initialData?: Partial<Transferencia>;
}

// ==================== CONSTANTES ====================
const TRANSFERENCIA_INICIAL: Transferencia = {
  almacen_origen_id: null,
  almacen_destino_id: null,
  notas: '',
  detalles: []
};

const crearDetalleVacio = (): DetalleTransferencia => ({
  producto_id: null,
  cantidad: 1,
  tempId: `detalle-${Date.now()}-${Math.random()}`
});

// ==================== COMPONENTE ====================
const Transferencia: React.FC<TransferenciaProps> = ({ onChange, initialData }) => {
  const [transferencia, setTransferencia] = useState<Transferencia>(() => ({
    ...TRANSFERENCIA_INICIAL,
    ...initialData,
    detalles: initialData?.detalles?.length ? initialData.detalles : [crearDetalleVacio()]
  }));

  const { almacenes, productos } = usePOSStore();

  // Actualizar padre cuando cambie el estado
  const notificarCambios = useCallback((nuevaTransferencia: Transferencia) => {
    onChange(nuevaTransferencia);
  }, [onChange]);

  // Actualizar campo principal
  const actualizarCampo = useCallback(<K extends keyof Transferencia>(
    campo: K,
    valor: Transferencia[K]
  ) => {
    setTransferencia(prev => {
      const nuevo = { ...prev, [campo]: valor };
      notificarCambios(nuevo);
      return nuevo;
    });
  }, [notificarCambios]);

  // Actualizar detalle específico
  const actualizarDetalle = useCallback((
    tempId: string,
    campo: keyof DetalleTransferencia,
    valor: any
  ) => {
    setTransferencia(prev => {
      const nuevo = {
        ...prev,
        detalles: prev.detalles.map(detalle =>
          detalle.tempId === tempId
            ? { ...detalle, [campo]: valor }
            : detalle
        )
      };
      notificarCambios(nuevo);
      return nuevo;
    });
  }, [notificarCambios]);

  // Agregar línea de producto
  const agregarDetalle = useCallback(() => {
    setTransferencia(prev => {
      const nuevo = {
        ...prev,
        detalles: [...prev.detalles, crearDetalleVacio()]
      };
      notificarCambios(nuevo);
      return nuevo;
    });
  }, [notificarCambios]);

  // Eliminar línea de producto
  const eliminarDetalle = useCallback((tempId: string) => {
    setTransferencia(prev => {
      // No permitir eliminar si solo queda uno
      if (prev.detalles.length === 1) {
        alert('Debe haber al menos un producto en la transferencia');
        return prev;
      }

      const nuevo = {
        ...prev,
        detalles: prev.detalles.filter(d => d.tempId !== tempId)
      };
      notificarCambios(nuevo);
      return nuevo;
    });
  }, [notificarCambios]);

  // Filtrar almacenes disponibles
  const almacenesOrigen = almacenes;
  const almacenesDestino = almacenes.filter(
    a => a.id !== transferencia.almacen_origen_id
  );

  // ==================== RENDER ====================
  return (
    <div className="Transferencia">
      <div className="Transferencia__header">
        <Package size={24} />
        <h3>Transferencia entre Almacenes</h3>
      </div>

      <div className="Transferencia__form">
        {/* Almacén Origen */}
        <SearchSelect
          label="Almacén Origen"
          items={almacenesOrigen}
          displayKey="nombre"
          returnKey="id"
          maxResults={5}
          onSelect={(id) => actualizarCampo('almacen_origen_id', id)}
        />

        {/* Almacén Destino */}
        <SearchSelect
          label="Almacén Destino"
          items={almacenesDestino}
          displayKey="nombre"
          returnKey="id"
          maxResults={5}
          onSelect={(id) => actualizarCampo('almacen_destino_id', id)}
        />

        {/* Notas */}
        <div className="form-field">
          <label htmlFor="notas">Notas (opcional)</label>
          <textarea
            id="notas"
            value={transferencia.notas}
            onChange={(e) => actualizarCampo('notas', e.target.value)}
            placeholder="Motivo o detalles de la transferencia..."
            rows={3}
          />
        </div>

        {/* Línea divisoria */}
        <div className="Transferencia__divider">
          <span>Productos a transferir</span>
        </div>

        {/* Lista de productos */}
        <div className="Transferencia__detalles">
          {transferencia.detalles.map((detalle, index) => (
            <div key={detalle.tempId} className="Transferencia__detalle">
              <div className="Transferencia__detalle-numero">
                {index + 1}
              </div>

              <div className="Transferencia__detalle-content">
                <SearchSelect
                  label="Producto"
                  items={productos}
                  displayKey="nombre"
                  returnKey="id"
                  maxResults={5}
                  onSelect={(id) => actualizarDetalle(detalle.tempId, 'producto_id', id)}
                />

                <NumberInput
                  label="Cantidad"
                  value={detalle.cantidad}
                  onChange={(val) => actualizarDetalle(detalle.tempId, 'cantidad', val)}
                  decimals={0}
                  minValue={1}
                />
              </div>

              <button
                type="button"
                className="Transferencia__detalle-delete"
                onClick={() => eliminarDetalle(detalle.tempId)}
                title="Eliminar producto"
                disabled={transferencia.detalles.length === 1}
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>

        {/* Botón agregar producto */}
        <button
          type="button"
          className="Transferencia__agregar"
          onClick={agregarDetalle}
        >
          <Plus size={18} />
          Agregar producto
        </button>

        {/* Resumen */}
        <div className="Transferencia__resumen">
          <strong>Total de productos:</strong> {transferencia.detalles.length}
        </div>
      </div>
    </div>
  );
};

export default Transferencia;