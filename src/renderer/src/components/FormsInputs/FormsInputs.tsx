import React from 'react';
import { Eye, EyeOff, Check, AlertCircle } from 'lucide-react';
import './FormInput.scss';

// ==================== TIPOS ====================
export type InputType = 'text' | 'number' | 'textarea' | 'select' | 'checkbox' | 'password';

export interface SelectOption {
  label: string;
  value: string | number;
  disabled?: boolean;
}

export interface InputConfig {
  name: string;
  label?: string;
  type: InputType;
  value: any;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
  
  // Para inputs específicos
  min?: number;
  max?: number;
  step?: number;
  rows?: number;
  options?: SelectOption[];
  
  // Grid control
  col?: 1 | 2 | 3 | 4 | 6 | 12; // Cuántas columnas ocupa (de 12)
}

export interface FormInputProps {
  inputs: InputConfig[];
  onChange: (name: string, value: any) => void;
  columns?: 1 | 2 | 3 | 4; // Columnas del grid
  gap?: 'sm' | 'md' | 'lg';
  compact?: boolean;
}

// ==================== INPUT INDIVIDUAL ====================
interface SingleInputProps extends InputConfig {
  onChange: (value: any) => void;
  compact?: boolean;
}

const SingleInput: React.FC<SingleInputProps> = ({
  name,
  label,
  type,
  value,
  placeholder,
  required,
  disabled,
  error,
  hint,
  icon,
  min,
  max,
  step,
  rows = 3,
  options = [],
  onChange,
  compact
}) => {
  const [showPassword, setShowPassword] = React.useState(false);
  const inputId = `input-${name}`;

  // Renderizar según tipo
  const renderInput = () => {
    switch (type) {
      case 'text':
      case 'password':
        return (
          <div className="FormInput__wrapper">
            {icon && <span className="FormInput__icon">{icon}</span>}
            <input
              id={inputId}
              type={type === 'password' && showPassword ? 'text' : type}
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              disabled={disabled}
              required={required}
              className={`FormInput__input ${icon ? 'has-icon' : ''} ${error ? 'error' : ''}`}
            />
            {type === 'password' && (
              <button
                type="button"
                className="FormInput__toggle-password"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            )}
          </div>
        );

      case 'number':
        return (
          <div className="FormInput__wrapper">
            {icon && <span className="FormInput__icon">{icon}</span>}
            <input
              id={inputId}
              type="number"
              value={value ?? ''}
              onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
              placeholder={placeholder}
              disabled={disabled}
              required={required}
              min={min}
              max={max}
              step={step}
              className={`FormInput__input ${icon ? 'has-icon' : ''} ${error ? 'error' : ''}`}
            />
          </div>
        );

      case 'textarea':
        return (
          <textarea
            id={inputId}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            required={required}
            rows={rows}
            className={`FormInput__textarea ${error ? 'error' : ''}`}
          />
        );

      case 'select':
        return (
          <div className="FormInput__wrapper">
            {icon && <span className="FormInput__icon">{icon}</span>}
            <select
              id={inputId}
              value={value ?? ''}
              onChange={(e) => onChange(e.target.value)}
              disabled={disabled}
              required={required}
              className={`FormInput__select ${icon ? 'has-icon' : ''} ${error ? 'error' : ''}`}
            >
              {placeholder && <option value="">{placeholder}</option>}
              {options.map((opt) => (
                <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        );

      case 'checkbox':
        return (
          <label className="FormInput__checkbox-wrapper">
            <input
              id={inputId}
              type="checkbox"
              checked={!!value}
              onChange={(e) => onChange(e.target.checked)}
              disabled={disabled}
              className="FormInput__checkbox"
            />
            <span className="FormInput__checkbox-custom">
              {value && <Check size={14} />}
            </span>
            {label && <span className="FormInput__checkbox-label">{label}</span>}
          </label>
        );

      default:
        return null;
    }
  };

  // Checkbox tiene layout diferente
  if (type === 'checkbox') {
    return (
      <div className={`FormInput__field ${compact ? 'compact' : ''} ${error ? 'has-error' : ''}`}>
        {renderInput()}
        {error && (
          <span className="FormInput__error">
            <AlertCircle size={12} /> {error}
          </span>
        )}
        {hint && !error && <span className="FormInput__hint">{hint}</span>}
      </div>
    );
  }

  // Layout normal para otros inputs
  return (
    <div className={`FormInput__field ${compact ? 'compact' : ''} ${error ? 'has-error' : ''}`}>
      {/* {label && type !== 'checkbox' && ( */}
      {label && (
        <label htmlFor={inputId} className="FormInput__label">
          {label}
          {required && <span className="FormInput__required">*</span>}
        </label>
      )}
      {renderInput()}
      {error && (
        <span className="FormInput__error">
          <AlertCircle size={12} /> {error}
        </span>
      )}
      {hint && !error && <span className="FormInput__hint">{hint}</span>}
    </div>
  );
};

// ==================== COMPONENTE PRINCIPAL ====================
const FormInput: React.FC<FormInputProps> = ({
  inputs,
  onChange,
  columns = 2,
  gap = 'md',
  compact = false
}) => {
  return (
    <div 
      className={`FormInput__grid gap-${gap} ${compact ? 'compact' : ''}`}
      style={{
        gridTemplateColumns: `repeat(${columns}, 1fr)`
      }}
    >
      {inputs.map((input) => (
        <div
          key={input.name}
          className="FormInput__cell"
          style={{
            gridColumn: input.col ? `span ${Math.min(input.col, columns)}` : 'span 1'
          }}
        >
          <SingleInput
            {...input}
            onChange={(value) => onChange(input.name, value)}
            compact={compact}
          />
        </div>
      ))}
    </div>
  );
};

export default FormInput;