import React from 'react';
import { usePriceInput, useNumberInput } from '../../hooks/usePriceInput';
import './inputNumber.scss';

// ============================================
// PRICE INPUT COMPONENT
// ============================================

interface PriceInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  decimals?: number;
  minValue?: number;
  maxValue?: number;
  prefix?: string; // Ej: "$", "RD$"
  suffix?: string; // Ej: "USD", "DOP"
}

export const PriceInput: React.FC<PriceInputProps> = ({
  label,
  value,
  onChange,
  required = false,
  disabled = false,
  className = '',
  placeholder = '0.00',
  decimals = 2,
  minValue = 0,
  maxValue,
  prefix,
  suffix,
}) => {
  const price = usePriceInput(value, {
    decimals,
    minValue,
    maxValue,
  });

  // Sincronizar cambios hacia el padre
  React.useEffect(() => {
    if (price.numericValue !== value) {
      onChange(price.numericValue);
    }
  }, [price.numericValue]);

  // Sincronizar cambios desde el padre
  React.useEffect(() => {
    if (value !== price.numericValue) {
      price.setValue(value);
    }
  }, [value]);

  return (
    <label className={`form-label ${className}`}>
      <span className="label-text">
        {label} {required && <span className="required">*</span>}
      </span>
      <div className="input-wrapper">
        {prefix && <span className="input-prefix">{prefix}</span>}
        <input
          type="text"
          className="form-input"
          value={price.displayValue}
          onFocus={price.handleFocus}
          onBlur={price.handleBlur}
          onChange={price.handleChange}
          disabled={disabled}
          placeholder={placeholder}
          required={required}
        />
        {suffix && <span className="input-suffix">{suffix}</span>}
      </div>
    </label>
  );
};

// ============================================
// NUMBER INPUT COMPONENT
// ============================================

interface NumberInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  decimals?: number;
  minValue?: number;
  maxValue?: number;
  suffix?: string;
}

export const NumberInput: React.FC<NumberInputProps> = ({
  label,
  value,
  onChange,
  required = false,
  disabled = false,
  className = '',
  placeholder = '0',
  decimals = 0,
  minValue = 0,
  maxValue,
  suffix,
}) => {
  const number = useNumberInput(value, {
    decimals,
    minValue,
    maxValue,
  });

  // Sincronizar cambios hacia el padre
  React.useEffect(() => {
    if (number.numericValue !== value) {
      onChange(number.numericValue);
    }
  }, [number.numericValue]);

  // Sincronizar cambios desde el padre
  React.useEffect(() => {
    if (value !== number.numericValue) {
      number.setValue(value);
    }
  }, [value]);

  return (
    <label className={`form-label ${className}`}>
      <span className="label-text">
        {label} {required && <span className="required">*</span>}
      </span>
      <div className="input-wrapper">
        <input
          type="text"
          className="form-input"
          value={number.displayValue}
          onFocus={number.handleFocus}
          onBlur={number.handleBlur}
          onChange={number.handleChange}
          disabled={disabled}
          placeholder={placeholder}
          required={required}
        />
        {suffix && <span className="input-suffix">{suffix}</span>}
      </div>
    </label>
  );
};
