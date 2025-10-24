import { useState, useCallback } from 'react';

// ============================================
// INTERFACES
// ============================================
interface UsePriceInputOptions {
  decimals?: number;
  locale?: string;
  allowNegative?: boolean;
  maxValue?: number;
  minValue?: number;
}

interface UsePriceInputReturn {
  displayValue: string;
  numericValue: number;
  handleFocus: () => void;
  handleBlur: () => void;
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setValue: (value: number) => void;
  reset: () => void;
}

// ============================================
// UTILIDADES
// ============================================

/**
 * Formatea un número como precio con separadores de miles y decimales
 */
export const formatPrice = (
  value: number,
  decimals: number = 2,
  locale: string = 'es-DO'
): string => {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};

/**
 * Limpia una cadena de precio dejando solo números y punto decimal
 */
const cleanPriceString = (value: string): string => {
  // Eliminar todo excepto números, punto y coma
  let cleaned = value.replace(/[^\d.,-]/g, '');
  
  // Reemplazar coma por punto (para soportar formato europeo)
  cleaned = cleaned.replace(',', '.');
  
  // Asegurar que solo haya un punto decimal
  const parts = cleaned.split('.');
  if (parts.length > 2) {
    cleaned = parts[0] + '.' + parts.slice(1).join('');
  }
  
  return cleaned;
};

/**
 * Convierte string a número manejando casos edge
 */
const parseNumber = (value: string): number => {
  if (!value || value === '' || value === '-') return 0;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 0 : parsed;
};

// ============================================
// HOOK PRINCIPAL
// ============================================

/**
 * Hook para manejar inputs de precio con formato automático
 * 
 * @example
 * ```tsx
 * const precio = usePriceInput(producto.precio_venta, {
 *   decimals: 2,
 *   minValue: 0
 * });
 * 
 * <input
 *   value={precio.displayValue}
 *   onFocus={precio.handleFocus}
 *   onBlur={precio.handleBlur}
 *   onChange={precio.handleChange}
 * />
 * ```
 */
export const usePriceInput = (
  initialValue: number = 0,
  options: UsePriceInputOptions = {}
): UsePriceInputReturn => {
  const {
    decimals = 2,
    locale = 'es-DO',
    allowNegative = false,
    maxValue = Infinity,
    minValue = 0,
  } = options;

  // Estado interno
  const [numericValue, setNumericValue] = useState<number>(initialValue);
  const [displayValue, setDisplayValue] = useState<string>(
    formatPrice(initialValue, decimals, locale)
  );
  const [isFocused, setIsFocused] = useState(false);

  // ---------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------

  /**
   * Al hacer focus, mostrar el valor numérico sin formato
   */
  const handleFocus = useCallback(() => {
    setIsFocused(true);
    // Si es 0, dejar el input vacío para facilitar la escritura
    if (numericValue === 0) {
      setDisplayValue('');
    } else {
      // Mostrar el número sin formato de miles, pero con decimales
      setDisplayValue(numericValue.toFixed(decimals));
    }
  }, [numericValue, decimals]);

  /**
   * Al perder focus, formatear el valor
   */
  const handleBlur = useCallback(() => {
    setIsFocused(false);
    
    let value = parseNumber(displayValue);
    
    // Aplicar restricciones
    if (!allowNegative && value < 0) value = 0;
    if (value < minValue) value = minValue;
    if (value > maxValue) value = maxValue;
    
    setNumericValue(value);
    setDisplayValue(formatPrice(value, decimals, locale));
  }, [displayValue, allowNegative, minValue, maxValue, decimals, locale]);

  /**
   * Al cambiar el valor mientras está en focus
   */
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    
    // Permitir vacío
    if (input === '') {
      setDisplayValue('');
      setNumericValue(0);
      return;
    }
    
    // Permitir solo el símbolo negativo inicial
    if (allowNegative && input === '-') {
      setDisplayValue('-');
      return;
    }
    
    // Limpiar y validar
    const cleaned = cleanPriceString(input);
    
    // Validar que sea un número válido o esté en proceso de serlo
    if (cleaned === '' || cleaned === '.' || /^\d*\.?\d*$/.test(cleaned)) {
      setDisplayValue(cleaned);
      
      // Actualizar valor numérico si es válido
      const parsed = parseNumber(cleaned);
      if (!isNaN(parsed)) {
        setNumericValue(parsed);
      }
    }
  }, [allowNegative]);

  /**
   * Establecer valor programáticamente
   */
  const setValue = useCallback((value: number) => {
    setNumericValue(value);
    if (!isFocused) {
      setDisplayValue(formatPrice(value, decimals, locale));
    } else {
      setDisplayValue(value === 0 ? '' : value.toFixed(decimals));
    }
  }, [isFocused, decimals, locale]);

  /**
   * Resetear al valor inicial
   */
  const reset = useCallback(() => {
    setNumericValue(initialValue);
    setDisplayValue(formatPrice(initialValue, decimals, locale));
    setIsFocused(false);
  }, [initialValue, decimals, locale]);

  return {
    displayValue,
    numericValue,
    handleFocus,
    handleBlur,
    handleChange,
    setValue,
    reset,
  };
};

// ============================================
// HOOK SIMPLIFICADO PARA NÚMEROS
// ============================================

interface UseNumberInputOptions {
  decimals?: number;
  allowNegative?: boolean;
  maxValue?: number;
  minValue?: number;
}

/**
 * Hook simplificado para inputs numéricos sin formato de precio
 */
export const useNumberInput = (
  initialValue: number = 0,
  options: UseNumberInputOptions = {}
): UsePriceInputReturn => {
  const {
    decimals = 0,
    allowNegative = false,
    maxValue = Infinity,
    minValue = 0,
  } = options;

  const [numericValue, setNumericValue] = useState<number>(initialValue);
  const [displayValue, setDisplayValue] = useState<string>(initialValue.toString());

  const handleFocus = useCallback(() => {
    if (numericValue === 0) {
      setDisplayValue('');
    }
  }, [numericValue]);

  const handleBlur = useCallback(() => {
    
    let value = parseNumber(displayValue);
    
    if (!allowNegative && value < 0) value = 0;
    if (value < minValue) value = minValue;
    if (value > maxValue) value = maxValue;
    
    // Redondear según decimales
    if (decimals === 0) {
      value = Math.round(value);
    } else {
      value = Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
    }
    
    setNumericValue(value);
    setDisplayValue(value.toString());
  }, [displayValue, allowNegative, minValue, maxValue, decimals]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    
    if (input === '') {
      setDisplayValue('');
      setNumericValue(0);
      return;
    }
    
    if (allowNegative && input === '-') {
      setDisplayValue('-');
      return;
    }
    
    const cleaned = cleanPriceString(input);
    
    if (decimals === 0) {
      // Solo enteros
      if (/^\d*$/.test(cleaned)) {
        setDisplayValue(cleaned);
        const parsed = parseNumber(cleaned);
        if (!isNaN(parsed)) {
          setNumericValue(parsed);
        }
      }
    } else {
      // Permitir decimales
      if (/^\d*\.?\d*$/.test(cleaned)) {
        setDisplayValue(cleaned);
        const parsed = parseNumber(cleaned);
        if (!isNaN(parsed)) {
          setNumericValue(parsed);
        }
      }
    }
  }, [allowNegative, decimals]);

  const setValue = useCallback((value: number) => {
    setNumericValue(value);
    setDisplayValue(value.toString());
  }, []);

  const reset = useCallback(() => {
    setNumericValue(initialValue);
    setDisplayValue(initialValue.toString());
  }, [initialValue]);

  return {
    displayValue,
    numericValue,
    handleFocus,
    handleBlur,
    handleChange,
    setValue,
    reset,
  };
};