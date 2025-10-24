import React, { useEffect, useState, useCallback } from 'react'
import SearchSelect from '@renderer/components/SearchSelectProps/SearchSelectProps'
import { NumberInput } from '@renderer/components/FormatNumberInput/InputNumber'
import { usePOSStore } from '@renderer/store/usePOSStore'
import './Stock.scss'

// Tipos
export type TipoAjuste = 'ajuste_positivo' | 'ajuste_negativo'

export interface Ajuste {
  producto_id: number | null
  almacen_id: number | null
  cantidad: number
  tipo: TipoAjuste
  motivo: string
}

interface StockProps {
  onChange: (data: Ajuste) => void
  initialData?: Partial<Ajuste>
}

// Constantes
const AJUSTE_INICIAL: Ajuste = {
  producto_id: null,
  almacen_id: null,
  cantidad: 0,
  tipo: 'ajuste_positivo',
  motivo: ''
}

const TIPOS_AJUSTE: Array<{ value: TipoAjuste; label: string }> = [
  { value: 'ajuste_positivo', label: 'Ajuste positivo' },
  { value: 'ajuste_negativo', label: 'Ajuste negativo' }
]

// Componente principal
const Stock: React.FC<StockProps> = ({ onChange, initialData }) => {
  const [ajuste, setAjuste] = useState<Ajuste>(() => ({
    ...AJUSTE_INICIAL,
    ...initialData
  }))
  
  const { productos, almacenes } = usePOSStore()

  // Notificar cambios al padre
  useEffect(() => {
    onChange(ajuste)
  }, [ajuste, onChange])

  // Manejador genérico de cambios
  const handleFieldChange = useCallback(<K extends keyof Ajuste>(
    field: K,
    value: Ajuste[K]
  ) => {
    setAjuste(prev => ({
      ...prev,
      [field]: value
    }))
  }, [])

  return (
    <div className="Stock">
      <SearchSelect
        label="Producto"
        items={productos}
        displayKey="nombre"
        returnKey="id"
        maxResults={5}
        onSelect={(id) => handleFieldChange('producto_id', id)}
      />

      <SearchSelect
        label="Almacén"
        items={almacenes}
        displayKey="nombre"
        returnKey="id"
        maxResults={5}
        onSelect={(id) => handleFieldChange('almacen_id', id)}
      />

      <NumberInput
        label="Cantidad"
        value={ajuste.cantidad}
        onChange={(val) => handleFieldChange('cantidad', val)}
        decimals={0}
        minValue={0}
      />

      <div className="form-field">
        <label htmlFor="tipo">Tipo de ajuste</label>
        <select
          id="tipo"
          value={ajuste.tipo}
          onChange={(e) => handleFieldChange('tipo', e.target.value as TipoAjuste)}
        >
          {TIPOS_AJUSTE.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="form-field">
        <label htmlFor="motivo">Motivo</label>
        <input
          type="text"
          id="motivo"
          value={ajuste.motivo}
          placeholder="Motivo del ajuste"
          onChange={(e) => handleFieldChange('motivo', e.target.value)}
        />
      </div>
    </div>
  )
}

export default Stock